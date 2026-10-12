import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import com.google.gson.*;
import org.languagetool.JLanguageTool;
import org.languagetool.Languages;
import org.languagetool.rules.Rule;
import org.languagetool.rules.RuleMatch;

/** A single-threaded, offline LanguageTool bridge with no sockets or file input. */
public final class OfflineGrammar {
 public static void main(String[] args) throws Exception {
  PrintWriter output=new PrintWriter(new OutputStreamWriter(System.out,StandardCharsets.UTF_8),true);
  System.setOut(new PrintStream(OutputStream.nullOutputStream()));
  JsonObject config=JsonParser.parseString(Files.readString(Path.of(args[0]),StandardCharsets.UTF_8)).getAsJsonObject();
  Set<String> allowed=new HashSet<>();
  for(JsonElement id:config.getAsJsonArray("enabledGrammarRules"))allowed.add(id.getAsString());
  JLanguageTool tool=new JLanguageTool(Languages.getLanguageForShortCode("en-US"));
  for(Rule rule:tool.getAllActiveRules())if(!allowed.contains(rule.getId()))tool.disableRule(rule.getId());
  BufferedReader input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8));
  for(String line;(line=input.readLine())!=null;){
   JsonObject response=new JsonObject();
   try{
    JsonObject request=JsonParser.parseString(line).getAsJsonObject();response.add("id",request.get("id"));
    String text=request.get("text").getAsString();if(text.length()>11000)throw new IllegalArgumentException();
    JsonArray matches=new JsonArray();
    for(RuleMatch match:tool.check(text)){
     if(!allowed.contains(match.getRule().getId())||match.getSentence()==null||match.getFromPosSentence()<0)continue;
     int a=match.getFromPos()-match.getFromPosSentence();String sentence=match.getSentence().getText();int b=a+sentence.length();
     if(a<0||b>text.length()||!text.substring(a,b).equals(sentence))continue;
     JsonObject m=new JsonObject();m.addProperty("offset",match.getFromPos());m.addProperty("length",match.getToPos()-match.getFromPos());m.addProperty("evidenceStart",a);m.addProperty("evidenceEnd",b);
     m.addProperty("message",match.getMessage().replaceAll("<[^>]+>",""));m.addProperty("rule",match.getRule().getId());JsonArray replacements=new JsonArray();
     for(String replacement:match.getSuggestedReplacements())replacements.add(replacement);m.add("replacements",replacements);matches.add(m);
    }
    response.add("matches",matches);
   }catch(Exception error){response.addProperty("error","Local grammar check failed.");}
   output.println(response);
  }
 }
}
